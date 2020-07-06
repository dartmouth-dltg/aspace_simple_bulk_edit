require 'aspace_logger'
class DartmouthBulkContainerUpdateItems
  
  include JSONModel
    
  attr_accessor :dartmouth_bulk_container_update_items
    
  def initialize(uris)
    @uris = uris
    @dartmouth_bulk_container_update_items = []
    build_bulk_container_upate_items
  end

  def build_bulk_container_upate_items
    @uris.each do | uri |
      if record_exists?(uri)
        build_bulk_container_upate_item_for(uri)
      end
    end
  end

  def build_bulk_container_upate_item_for(uri)

    bulk_container_upate_item = { "selected" => {"ref" => uri} }

    parsed = JSONModel.parse_reference(uri)
    bulk_container_upate_item[parsed[:type]] = { "ref" => uri }
    @dartmouth_bulk_container_update_items << bulk_container_upate_item
    
  end
  
  def record_exists?(uri)
    id = JSONModel.parse_reference(uri)[:id]
    type = JSONModel.parse_reference(uri)[:type]
    
    @model = find_model_by_json_model_type(type)

    id && !@model[id].nil?
  end

  private
  
  def find_model_by_json_model_type(type)
      ASModel.all_models.find {|model|
        jsonmodel = model.my_jsonmodel(true)
        jsonmodel && jsonmodel.record_type == type
      }
  end

end
